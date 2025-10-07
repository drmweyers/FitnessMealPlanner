import { pgTable, uuid, text, timestamp, decimal, boolean, integer, jsonb, pgEnum, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { recipes } from './schema';
import { users } from './schema';

// Enum for substitution categories
export const substitutionCategoryEnum = pgEnum('substitution_category', [
  'dietary',
  'allergy', 
  'preference',
  'availability',
  'cost',
  'nutritional'
]);

// Recipe Substitutions table
export const recipeSubstitutions = pgTable('recipe_substitutions', {
  id: uuid('id').defaultRandom().primaryKey(),
  recipeId: uuid('recipe_id').references(() => recipes.id, { onDelete: 'cascade' }),
  originalIngredient: text('original_ingredient').notNull(),
  substituteIngredient: text('substitute_ingredient').notNull(),
  category: substitutionCategoryEnum('category').notNull(),
  reason: text('reason'),
  nutritionalImpact: jsonb('nutritional_impact').default({}),
  confidenceScore: decimal('confidence_score', { precision: 3, scale: 2 }),
  isAiGenerated: boolean('is_ai_generated').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
}, (table) => ({
  recipeIdx: index('idx_recipe_substitutions_recipe_id').on(table.recipeId),
  originalIdx: index('idx_recipe_substitutions_original').on(table.originalIngredient),
  categoryIdx: index('idx_recipe_substitutions_category').on(table.category)
}));

// Substitution Ratings table
export const substitutionRatings = pgTable('substitution_ratings', {
  id: uuid('id').defaultRandom().primaryKey(),
  substitutionId: uuid('substitution_id').references(() => recipeSubstitutions.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  rating: integer('rating').notNull(),
  feedback: text('feedback'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
}, (table) => ({
  uniqueUserSubstitution: uniqueIndex('unique_user_substitution').on(table.substitutionId, table.userId),
  substitutionIdx: index('idx_substitution_ratings_substitution').on(table.substitutionId)
}));

// Global Substitutions table
export const globalSubstitutions = pgTable('global_substitutions', {
  id: uuid('id').defaultRandom().primaryKey(),
  originalIngredient: text('original_ingredient').notNull(),
  substituteIngredient: text('substitute_ingredient').notNull(),
  category: substitutionCategoryEnum('category').notNull(),
  dietaryTags: text('dietary_tags').array().default([]),
  nutritionalDifference: jsonb('nutritional_difference').default({}),
  usageNotes: text('usage_notes'),
  popularityScore: integer('popularity_score').default(0),
  isVerified: boolean('is_verified').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
}, (table) => ({
  originalIdx: index('idx_global_substitutions_original').on(table.originalIngredient)
}));

// User Substitution Preferences table
export const userSubstitutionPreferences = pgTable('user_substitution_preferences', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).unique(),
  avoidIngredients: text('avoid_ingredients').array().default([]),
  preferredSubstitutes: jsonb('preferred_substitutes').default({}),
  dietaryRestrictions: text('dietary_restrictions').array().default([]),
  autoApplySubstitutions: boolean('auto_apply_substitutions').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
}, (table) => ({
  userIdx: index('idx_user_preferences_user').on(table.userId)
}));

// Relations
export const recipeSubstitutionsRelations = relations(recipeSubstitutions, ({ one, many }) => ({
  recipe: one(recipes, {
    fields: [recipeSubstitutions.recipeId],
    references: [recipes.id]
  }),
  ratings: many(substitutionRatings)
}));

export const substitutionRatingsRelations = relations(substitutionRatings, ({ one }) => ({
  substitution: one(recipeSubstitutions, {
    fields: [substitutionRatings.substitutionId],
    references: [recipeSubstitutions.id]
  }),
  user: one(users, {
    fields: [substitutionRatings.userId],
    references: [users.id]
  })
}));

export const userSubstitutionPreferencesRelations = relations(userSubstitutionPreferences, ({ one }) => ({
  user: one(users, {
    fields: [userSubstitutionPreferences.userId],
    references: [users.id]
  })
}));

// Types for TypeScript
export type RecipeSubstitution = typeof recipeSubstitutions.$inferSelect;
export type NewRecipeSubstitution = typeof recipeSubstitutions.$inferInsert;
export type SubstitutionRating = typeof substitutionRatings.$inferSelect;
export type NewSubstitutionRating = typeof substitutionRatings.$inferInsert;
export type GlobalSubstitution = typeof globalSubstitutions.$inferSelect;
export type NewGlobalSubstitution = typeof globalSubstitutions.$inferInsert;
export type UserSubstitutionPreference = typeof userSubstitutionPreferences.$inferSelect;
export type NewUserSubstitutionPreference = typeof userSubstitutionPreferences.$inferInsert;

export type SubstitutionCategory = 'dietary' | 'allergy' | 'preference' | 'availability' | 'cost' | 'nutritional';