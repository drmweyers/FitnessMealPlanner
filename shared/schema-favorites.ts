/**
 * Recipe Favorites & Collections Schema
 * 
 * Core favoriting system that allows users to save and organize recipes
 * into collections. Supports different types of favorites and social features.
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

// Enum for favorite types
export const favoriteTypeEnum = pgEnum("favorite_type", [
  "standard",    // Regular favorite
  "want_to_try", // Want to try recipe
  "made_it",     // Already made this recipe
  "love_it",     // Really love this recipe
]);

/**
 * Recipe Favorites Table
 * 
 * Core table for storing user favorites with different types and notes.
 * Optimized for fast lookups by user and recipe.
 */
export const recipeFavorites = pgTable("recipe_favorites", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  recipeId: uuid("recipe_id")
    .references(() => recipes.id, { onDelete: "cascade" })
    .notNull(),
  favoriteType: favoriteTypeEnum("favorite_type").default("standard").notNull(),
  notes: text("notes"), // Personal notes about the recipe
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Composite primary key to prevent duplicate favorites
  userRecipeIdx: index("recipe_favorites_user_recipe_idx").on(table.userId, table.recipeId),
  userIdx: index("recipe_favorites_user_idx").on(table.userId),
  recipeIdx: index("recipe_favorites_recipe_idx").on(table.recipeId),
  typeIdx: index("recipe_favorites_type_idx").on(table.favoriteType),
  createdAtIdx: index("recipe_favorites_created_at_idx").on(table.createdAt),
}));

/**
 * Favorite Collections Table
 * 
 * Allows users to organize their favorites into custom collections.
 * Supports both private and public collections for social features.
 */
export const favoriteCollections = pgTable("favorite_collections", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  isPublic: boolean("is_public").default(false), // For sharing collections
  colorTheme: varchar("color_theme", { length: 50 }).default("blue"), // UI customization
  coverImageUrl: text("cover_image_url"), // Optional collection cover
  recipeCount: integer("recipe_count").default(0), // Denormalized for performance
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdx: index("favorite_collections_user_idx").on(table.userId),
  publicIdx: index("favorite_collections_public_idx").on(table.isPublic),
  nameIdx: index("favorite_collections_name_idx").on(table.name),
}));

/**
 * Collection Recipes Table
 * 
 * Junction table linking recipes to collections with ordering support.
 * Allows recipes to be in multiple collections.
 */
export const collectionRecipes = pgTable("collection_recipes", {
  id: uuid("id").primaryKey().defaultRandom(),
  collectionId: uuid("collection_id")
    .references(() => favoriteCollections.id, { onDelete: "cascade" })
    .notNull(),
  recipeId: uuid("recipe_id")
    .references(() => recipes.id, { onDelete: "cascade" })
    .notNull(),
  orderIndex: integer("order_index").default(0), // For custom ordering within collections
  addedAt: timestamp("added_at").defaultNow(),
  addedBy: uuid("added_by")
    .references(() => users.id, { onDelete: "set null" }), // Track who added if shared collection
  notes: text("notes"), // Collection-specific notes about this recipe
}, (table) => ({
  collectionIdx: index("collection_recipes_collection_idx").on(table.collectionId),
  recipeIdx: index("collection_recipes_recipe_idx").on(table.recipeId),
  // Unique constraint to prevent duplicate recipes in same collection
  collectionRecipeIdx: index("collection_recipes_unique_idx").on(table.collectionId, table.recipeId),
  orderIdx: index("collection_recipes_order_idx").on(table.collectionId, table.orderIndex),
}));

/**
 * Collection Followers Table
 * 
 * Allows users to follow public collections created by others.
 * Enables social discovery of recipe collections.
 */
export const collectionFollowers = pgTable("collection_followers", {
  id: uuid("id").primaryKey().defaultRandom(),
  collectionId: uuid("collection_id")
    .references(() => favoriteCollections.id, { onDelete: "cascade" })
    .notNull(),
  followerId: uuid("follower_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  followedAt: timestamp("followed_at").defaultNow(),
  notificationsEnabled: boolean("notifications_enabled").default(true),
}, (table) => ({
  collectionIdx: index("collection_followers_collection_idx").on(table.collectionId),
  followerIdx: index("collection_followers_follower_idx").on(table.followerId),
  // Unique constraint to prevent duplicate follows
  uniqueFollowIdx: index("collection_followers_unique_idx").on(table.collectionId, table.followerId),
}));

// Type exports for favorites system
export type InsertRecipeFavorite = typeof recipeFavorites.$inferInsert;
export type RecipeFavorite = typeof recipeFavorites.$inferSelect;

export type InsertFavoriteCollection = typeof favoriteCollections.$inferInsert;
export type FavoriteCollection = typeof favoriteCollections.$inferSelect;

export type InsertCollectionRecipe = typeof collectionRecipes.$inferInsert;
export type CollectionRecipe = typeof collectionRecipes.$inferSelect;

export type InsertCollectionFollower = typeof collectionFollowers.$inferInsert;
export type CollectionFollower = typeof collectionFollowers.$inferSelect;

// Validation schemas for API endpoints
export const createFavoriteSchema = z.object({
  recipeId: z.string().uuid(),
  favoriteType: z.enum(["standard", "want_to_try", "made_it", "love_it"]).default("standard"),
  notes: z.string().max(500).optional(),
});

export const createCollectionSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  isPublic: z.boolean().default(false),
  colorTheme: z.string().max(50).default("blue"),
  coverImageUrl: z.string().url().optional(),
});

export const addToCollectionSchema = z.object({
  collectionId: z.string().uuid(),
  recipeId: z.string().uuid(),
  orderIndex: z.number().int().min(0).optional(),
  notes: z.string().max(500).optional(),
});

export const updateCollectionSchema = createCollectionSchema.partial();

export const followCollectionSchema = z.object({
  collectionId: z.string().uuid(),
  notificationsEnabled: z.boolean().default(true),
});

// Extended types for API responses
export type FavoriteCollectionWithStats = FavoriteCollection & {
  recipeCount?: number;
  followerCount?: number;
  isFollowing?: boolean;
  recentRecipes?: Array<{
    id: string;
    name: string;
    imageUrl?: string;
  }>;
};

export type CollectionRecipeWithDetails = CollectionRecipe & {
  recipe?: {
    id: string;
    name: string;
    description?: string;
    imageUrl?: string;
    caloriesKcal: number;
    prepTimeMinutes: number;
    mealTypes: string[];
    dietaryTags: string[];
  };
};

export type UserFavoritesProfile = {
  userId: string;
  totalFavorites: number;
  collectionsCount: number;
  publicCollectionsCount: number;
  followingCount: number;
  recentFavorites: RecipeFavorite[];
  popularCollections: FavoriteCollectionWithStats[];
};

// Query helper schemas
export const favoritesFilterSchema = z.object({
  favoriteType: z.enum(["standard", "want_to_try", "made_it", "love_it"]).optional(),
  search: z.string().optional(),
  mealType: z.string().optional(),
  dietaryTag: z.string().optional(),
  page: z.number().default(1),
  limit: z.number().default(20),
  sortBy: z.enum(["created_at", "updated_at", "recipe_name"]).default("created_at"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export const collectionsFilterSchema = z.object({
  isPublic: z.boolean().optional(),
  search: z.string().optional(),
  userId: z.string().uuid().optional(),
  page: z.number().default(1),
  limit: z.number().default(20),
  sortBy: z.enum(["created_at", "updated_at", "name", "recipe_count"]).default("updated_at"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type FavoritesFilter = z.infer<typeof favoritesFilterSchema>;
export type CollectionsFilter = z.infer<typeof collectionsFilterSchema>;
export type CreateFavorite = z.infer<typeof createFavoriteSchema>;
export type CreateCollection = z.infer<typeof createCollectionSchema>;
export type AddToCollection = z.infer<typeof addToCollectionSchema>;
export type UpdateCollection = z.infer<typeof updateCollectionSchema>;
export type FollowCollection = z.infer<typeof followCollectionSchema>;