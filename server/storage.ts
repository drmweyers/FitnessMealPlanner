/**
 * FitMeal Pro Storage Layer
 * 
 * This module provides a clean abstraction layer over the database using the
 * Repository pattern. It handles all CRUD operations for users and recipes,
 * with comprehensive filtering, search capabilities, and proper error handling.
 * 
 * Architecture:
 * - IStorage interface defines the contract for all storage operations
 * - DatabaseStorage implements the interface using Drizzle ORM
 * - All database queries are centralized here for consistency
 * - Type safety is maintained through imported schema types
 */

import {
  users,
  recipes,
  type User,
  type UpsertUser,
  type Recipe,
  type InsertRecipe,
  type UpdateRecipe,
  type RecipeFilter,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, like, lte, gte, desc, sql } from "drizzle-orm";
import { inArray } from "drizzle-orm";

/**
 * Storage Interface
 * 
 * Defines all storage operations available in the application.
 * This interface allows for easy testing and potential future
 * implementations (e.g., in-memory storage for tests).
 */
export interface IStorage {
  // User operations (required for Replit Auth integration)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Recipe CRUD operations
  createRecipe(recipe: InsertRecipe): Promise<Recipe>;
  getRecipe(id: string): Promise<Recipe | undefined>;
  updateRecipe(id: string, updates: UpdateRecipe): Promise<Recipe | undefined>;
  deleteRecipe(id: string): Promise<boolean>;
  bulkDeleteRecipes(ids: string[]): Promise<number>;
  
  // Advanced recipe operations
  searchRecipes(filters: RecipeFilter): Promise<{ recipes: Recipe[]; total: number }>;
  approveRecipe(id: string): Promise<Recipe | undefined>;
  
  // Analytics and reporting
  getRecipeStats(): Promise<{
    total: number;
    approved: number;
    pending: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations (required for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Recipe operations
  async createRecipe(recipeData: InsertRecipe): Promise<Recipe> {
    const [recipe] = await db.insert(recipes).values(recipeData as any).returning();
    return recipe;
  }

  async getRecipe(id: string): Promise<Recipe | undefined> {
    const [recipe] = await db.select().from(recipes).where(eq(recipes.id, id));
    return recipe;
  }

  async updateRecipe(id: string, updates: UpdateRecipe): Promise<Recipe | undefined> {
    const updateData: any = { 
      ...updates, 
      lastUpdatedTimestamp: new Date() 
    };
    
    // Ensure array fields are properly handled
    if (updates.mealTypes) updateData.mealTypes = updates.mealTypes;
    if (updates.dietaryTags) updateData.dietaryTags = updates.dietaryTags;
    if (updates.mainIngredientTags) updateData.mainIngredientTags = updates.mainIngredientTags;
    if (updates.ingredientsJson) updateData.ingredientsJson = updates.ingredientsJson;
    
    const [recipe] = await db
      .update(recipes)
      .set(updateData)
      .where(eq(recipes.id, id))
      .returning();
    return recipe;
  }

  async deleteRecipe(id: string): Promise<boolean> {
    try {
      // First check if recipe exists
      const existingRecipe = await this.getRecipe(id);
      if (!existingRecipe) {
        return false;
      }
      
      await db.delete(recipes).where(eq(recipes.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting recipe:', error);
      return false;
    }
  }

  async bulkDeleteRecipes(ids: string[]): Promise<number> {
    try {
      const result = await db.delete(recipes).where(inArray(recipes.id, ids));
      return Number(result.rowCount) || 0;
    } catch (error) {
      console.error('Error bulk deleting recipes:', error);
      return 0;
    }
  }

  async approveRecipe(id: string): Promise<Recipe | undefined> {
    return this.updateRecipe(id, { isApproved: true });
  }

  async searchRecipes(filters: RecipeFilter): Promise<{ recipes: Recipe[]; total: number }> {
    const conditions = [];

    // Apply filters
    if (filters.approved !== undefined) {
      conditions.push(eq(recipes.isApproved, filters.approved));
    }

    if (filters.search) {
      const searchTerm = `%${filters.search.toLowerCase()}%`;
      conditions.push(
        sql`(
          LOWER(${recipes.name}) LIKE ${searchTerm} OR 
          LOWER(${recipes.description}) LIKE ${searchTerm} OR
          LOWER(${recipes.ingredientsJson}::text) LIKE ${searchTerm}
        )`
      );
    }

    if (filters.mealType) {
      conditions.push(sql`${recipes.mealTypes} @> ${JSON.stringify([filters.mealType])}`);
    }

    if (filters.dietaryTag) {
      conditions.push(sql`${recipes.dietaryTags} @> ${JSON.stringify([filters.dietaryTag])}`);
    }

    if (filters.maxPrepTime) {
      conditions.push(lte(recipes.prepTimeMinutes, filters.maxPrepTime));
    }

    if (filters.maxCalories) {
      conditions.push(lte(recipes.caloriesKcal, filters.maxCalories));
    }

    if (filters.minCalories) {
      conditions.push(gte(recipes.caloriesKcal, filters.minCalories));
    }

    if (filters.minProtein) {
      conditions.push(gte(recipes.proteinGrams, filters.minProtein.toString()));
    }

    if (filters.maxProtein) {
      conditions.push(lte(recipes.proteinGrams, filters.maxProtein.toString()));
    }

    if (filters.minCarbs) {
      conditions.push(gte(recipes.carbsGrams, filters.minCarbs.toString()));
    }

    if (filters.maxCarbs) {
      conditions.push(lte(recipes.carbsGrams, filters.maxCarbs.toString()));
    }

    if (filters.minFat) {
      conditions.push(gte(recipes.fatGrams, filters.minFat.toString()));
    }

    if (filters.maxFat) {
      conditions.push(lte(recipes.fatGrams, filters.maxFat.toString()));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(recipes)
      .where(whereClause);

    // Get paginated results
    const page = filters.page || 1;
    const limit = filters.limit || 12;
    const offset = (page - 1) * limit;

    const recipeResults = await db
      .select()
      .from(recipes)
      .where(whereClause)
      .orderBy(desc(recipes.creationTimestamp))
      .limit(limit)
      .offset(offset);

    return { recipes: recipeResults, total: count };
  }

  async getRecipeStats(): Promise<{
    total: number;
    approved: number;
    pending: number;
  }> {
    const [stats] = await db
      .select({
        total: sql<number>`count(*)`,
        approved: sql<number>`count(*) filter (where is_approved = true)`,
        pending: sql<number>`count(*) filter (where is_approved = false)`,
      })
      .from(recipes);

    return {
      total: stats.total,
      approved: stats.approved,
      pending: stats.pending,
    };
  }
}

export const storage = new DatabaseStorage();
