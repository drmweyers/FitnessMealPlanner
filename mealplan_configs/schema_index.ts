import { pgTable, text, timestamp, uuid, integer, boolean, jsonb, varchar, decimal } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table - for authentication
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  username: text('username'),
  password: text('password').notNull(),
  role: text('role').notNull(), // 'admin', 'trainer', 'customer'
  firstName: text('firstName'),
  lastName: text('lastName'),
  businessName: text('businessName'),
  phoneNumber: text('phoneNumber'),
  profileImageUrl: text('profileImageUrl'),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow(),
  trainerId: uuid('trainerId').references(() => users.id),
  resetToken: text('resetToken'),
  resetTokenExpiry: timestamp('resetTokenExpiry'),
  lastLogin: timestamp('lastLogin'),
  isActive: boolean('isActive').default(true)
});

// Customer Goals table
export const customerGoals = pgTable('customerGoals', {
  id: uuid('id').defaultRandom().primaryKey(),
  customerId: uuid('customerId').references(() => users.id).notNull(),
  goalType: text('goalType').notNull(),
  targetValue: decimal('targetValue', { precision: 10, scale: 2 }),
  currentValue: decimal('currentValue', { precision: 10, scale: 2 }),
  targetDate: timestamp('targetDate'),
  description: text('description'),
  isAchieved: boolean('isAchieved').default(false),
  priority: integer('priority').default(1),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow()
});

// Progress Measurements table
export const progressMeasurements = pgTable('progressMeasurements', {
  id: uuid('id').defaultRandom().primaryKey(),
  customerId: uuid('customerId').references(() => users.id).notNull(),
  date: timestamp('date').notNull(),
  weight: decimal('weight', { precision: 5, scale: 2 }),
  bodyFat: decimal('bodyFat', { precision: 4, scale: 1 }),
  muscleMass: decimal('muscleMass', { precision: 5, scale: 2 }),
  waist: decimal('waist', { precision: 4, scale: 1 }),
  chest: decimal('chest', { precision: 4, scale: 1 }),
  arms: decimal('arms', { precision: 4, scale: 1 }),
  thighs: decimal('thighs', { precision: 4, scale: 1 }),
  energyLevel: integer('energyLevel'),
  notes: text('notes'),
  createdAt: timestamp('createdAt').defaultNow()
});

// Ingredients table
export const ingredients = pgTable('ingredients', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  caloriesPer100g: decimal('caloriesPer100g', { precision: 6, scale: 2 }),
  proteinPer100g: decimal('proteinPer100g', { precision: 5, scale: 2 }),
  carbsPer100g: decimal('carbsPer100g', { precision: 5, scale: 2 }),
  fatPer100g: decimal('fatPer100g', { precision: 5, scale: 2 }),
  fiberPer100g: decimal('fiberPer100g', { precision: 5, scale: 2 }),
  sugarPer100g: decimal('sugarPer100g', { precision: 5, scale: 2 }),
  sodiumPer100g: decimal('sodiumPer100g', { precision: 7, scale: 2 }),
  isActive: boolean('isActive').default(true),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow()
});

// Recipes table
export const recipes = pgTable('recipes', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  instructions: text('instructions').notNull(),
  prepTime: integer('prepTime'), // minutes
  cookTime: integer('cookTime'), // minutes
  servings: integer('servings').notNull(),
  difficulty: text('difficulty'), // 'easy', 'medium', 'hard'
  category: text('category'), // 'breakfast', 'lunch', 'dinner', 'snack'
  tags: text('tags').array(),
  imageUrl: text('imageUrl'),
  trainerId: uuid('trainerId').references(() => users.id).notNull(),
  isPublic: boolean('isPublic').default(false),
  isActive: boolean('isActive').default(true),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow()
});

// Recipe Ingredients table (junction table)
export const recipeIngredients = pgTable('recipeIngredients', {
  id: uuid('id').defaultRandom().primaryKey(),
  recipeId: uuid('recipeId').references(() => recipes.id).notNull(),
  ingredientId: uuid('ingredientId').references(() => ingredients.id).notNull(),
  quantity: decimal('quantity', { precision: 8, scale: 2 }).notNull(),
  unit: text('unit').notNull(), // 'grams', 'cups', 'pieces', etc.
  notes: text('notes'),
  createdAt: timestamp('createdAt').defaultNow()
});

// Meal Plans table
export const mealPlans = pgTable('mealPlans', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  trainerId: uuid('trainerId').references(() => users.id).notNull(),
  targetCalories: integer('targetCalories'),
  targetProtein: decimal('targetProtein', { precision: 5, scale: 1 }),
  targetCarbs: decimal('targetCarbs', { precision: 5, scale: 1 }),
  targetFat: decimal('targetFat', { precision: 5, scale: 1 }),
  durationDays: integer('durationDays').notNull(),
  difficulty: text('difficulty'), // 'easy', 'medium', 'hard'
  tags: text('tags').array(),
  isTemplate: boolean('isTemplate').default(false),
  isActive: boolean('isActive').default(true),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow()
});

// Customer Meal Plans table (assigned meal plans)
export const customerMealPlans = pgTable('customerMealPlans', {
  id: uuid('id').defaultRandom().primaryKey(),
  customerId: uuid('customerId').references(() => users.id).notNull(),
  mealPlanId: uuid('mealPlanId').references(() => mealPlans.id).notNull(),
  trainerId: uuid('trainerId').references(() => users.id).notNull(),
  startDate: timestamp('startDate').notNull(),
  endDate: timestamp('endDate'),
  status: text('status').notNull().default('active'), // 'active', 'completed', 'paused'
  customizations: jsonb('customizations'), // Custom modifications
  progress: jsonb('progress'), // Tracking adherence
  notes: text('notes'),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow()
});

// Meal Plan Days table
export const mealPlanDays = pgTable('mealPlanDays', {
  id: uuid('id').defaultRandom().primaryKey(),
  mealPlanId: uuid('mealPlanId').references(() => mealPlans.id).notNull(),
  dayNumber: integer('dayNumber').notNull(), // 1, 2, 3, etc.
  totalCalories: integer('totalCalories'),
  totalProtein: decimal('totalProtein', { precision: 5, scale: 1 }),
  totalCarbs: decimal('totalCarbs', { precision: 5, scale: 1 }),
  totalFat: decimal('totalFat', { precision: 5, scale: 1 }),
  notes: text('notes'),
  createdAt: timestamp('createdAt').defaultNow()
});

// Meal Plan Meals table
export const mealPlanMeals = pgTable('mealPlanMeals', {
  id: uuid('id').defaultRandom().primaryKey(),
  mealPlanDayId: uuid('mealPlanDayId').references(() => mealPlanDays.id).notNull(),
  recipeId: uuid('recipeId').references(() => recipes.id),
  mealType: text('mealType').notNull(), // 'breakfast', 'lunch', 'dinner', 'snack'
  mealOrder: integer('mealOrder').notNull(), // Order within the day
  servings: decimal('servings', { precision: 4, scale: 2 }).notNull().default('1'),
  customInstructions: text('customInstructions'),
  createdAt: timestamp('createdAt').defaultNow()
});

// Sessions table - for authentication
export const sessions = pgTable('sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('userId').references(() => users.id).notNull(),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt').defaultNow()
});

// Activity Logs table
export const activityLogs = pgTable('activityLogs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('userId').references(() => users.id).notNull(),
  action: text('action').notNull(),
  entityType: text('entityType'), // 'recipe', 'meal_plan', 'customer'
  entityId: uuid('entityId'),
  metadata: jsonb('metadata'),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  createdAt: timestamp('createdAt').defaultNow()
});

// Define Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  recipes: many(recipes),
  mealPlans: many(mealPlans),
  customerMealPlans: many(customerMealPlans),
  customerGoals: many(customerGoals),
  progressMeasurements: many(progressMeasurements),
  sessions: many(sessions),
  activityLogs: many(activityLogs),
  trainer: one(users, {
    fields: [users.trainerId],
    references: [users.id]
  })
}));

export const recipesRelations = relations(recipes, ({ one, many }) => ({
  trainer: one(users, {
    fields: [recipes.trainerId],
    references: [users.id]
  }),
  recipeIngredients: many(recipeIngredients),
  mealPlanMeals: many(mealPlanMeals)
}));

export const ingredientsRelations = relations(ingredients, ({ many }) => ({
  recipeIngredients: many(recipeIngredients)
}));

export const recipeIngredientsRelations = relations(recipeIngredients, ({ one }) => ({
  recipe: one(recipes, {
    fields: [recipeIngredients.recipeId],
    references: [recipes.id]
  }),
  ingredient: one(ingredients, {
    fields: [recipeIngredients.ingredientId],
    references: [ingredients.id]
  })
}));

export const mealPlansRelations = relations(mealPlans, ({ one, many }) => ({
  trainer: one(users, {
    fields: [mealPlans.trainerId],
    references: [users.id]
  }),
  customerMealPlans: many(customerMealPlans),
  mealPlanDays: many(mealPlanDays)
}));

export const mealPlanDaysRelations = relations(mealPlanDays, ({ one, many }) => ({
  mealPlan: one(mealPlans, {
    fields: [mealPlanDays.mealPlanId],
    references: [mealPlans.id]
  }),
  meals: many(mealPlanMeals)
}));

export const mealPlanMealsRelations = relations(mealPlanMeals, ({ one }) => ({
  mealPlanDay: one(mealPlanDays, {
    fields: [mealPlanMeals.mealPlanDayId],
    references: [mealPlanDays.id]
  }),
  recipe: one(recipes, {
    fields: [mealPlanMeals.recipeId],
    references: [recipes.id]
  })
}));

export const customerMealPlansRelations = relations(customerMealPlans, ({ one }) => ({
  customer: one(users, {
    fields: [customerMealPlans.customerId],
    references: [users.id]
  }),
  mealPlan: one(mealPlans, {
    fields: [customerMealPlans.mealPlanId],
    references: [mealPlans.id]
  }),
  trainer: one(users, {
    fields: [customerMealPlans.trainerId],
    references: [users.id]
  })
}));

export const customerGoalsRelations = relations(customerGoals, ({ one }) => ({
  customer: one(users, {
    fields: [customerGoals.customerId],
    references: [users.id]
  })
}));

export const progressMeasurementsRelations = relations(progressMeasurements, ({ one }) => ({
  customer: one(users, {
    fields: [progressMeasurements.customerId],
    references: [users.id]
  })
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id]
  })
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  user: one(users, {
    fields: [activityLogs.userId],
    references: [users.id]
  })
}));